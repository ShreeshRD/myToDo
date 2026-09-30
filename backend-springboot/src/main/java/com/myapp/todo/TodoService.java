package com.myapp.todo;

import com.myapp.todo.dto.TodoOperationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Objects;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import java.util.Comparator;
import java.util.LinkedHashMap;

@Service
public class TodoService {

    private static final Logger logger = LoggerFactory.getLogger(TodoService.class);

    @Autowired
    private TodoItemRepository repository;

    public GroupedTodoItems getGroupedByDate() {
        Map<String, List<TodoItem>> itemsByDate = getAll().stream()
                .filter(item -> item.getTaskDate() != null)
                .collect(Collectors.groupingBy(
                        item -> item.getTaskDate().toString(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    list.sort(Comparator.comparing(TodoItem::getDayOrder,
                                            Comparator.nullsLast(Comparator.naturalOrder())));
                                    return list;
                                })));

        // Sort the map by date
        Map<String, List<TodoItem>> sortedItemsByDate = itemsByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toMap(
                        entry -> entry.getKey(), // Explicitly call getKey()
                        entry -> entry.getValue(), // Explicitly call getValue()
                        (oldValue, newValue) -> oldValue, // Merge function to handle collisions
                        LinkedHashMap::new // Supplier that produces a new LinkedHashMap
                ));

        GroupedTodoItems response = new GroupedTodoItems();
        response.setItemsByDate(sortedItemsByDate);
        return response;
    }

    /** All tasks that have not been deleted. */
    public List<TodoItem> getAll() {
        return StreamSupport.stream(repository.findAll().spliterator(), false)
                .filter(item -> !item.isDeleted())
                .collect(Collectors.toList());
    }

    /** Stamps sync metadata before a save; every write path goes through here. */
    private TodoItem touch(TodoItem item) {
        if (item.getUuid() == null) {
            item.setUuid(UUID.randomUUID().toString());
        }
        item.setUpdatedAt(System.currentTimeMillis());
        return repository.save(item);
    }

    public TodoOperationResult addTask(String category, String name, LocalDate taskDate,
            TodoItem.RepeatPattern repeatType, Integer repeatDuration, Integer priority, Boolean longTerm) {
        return addTask(category, name, taskDate, repeatType, repeatDuration, priority, longTerm, null, null);
    }

    public TodoOperationResult addTask(String category, String name, LocalDate taskDate,
            TodoItem.RepeatPattern repeatType, Integer repeatDuration, Integer priority, Boolean longTerm,
            LocalTime assignedTime, Integer reminderMinutesBefore) {
        // Calculate next order for the task date
        int nextOrder = activeOn(taskDate).size() + 1;

        // Create and populate the task
        TodoItem item = new TodoItem(taskDate, nextOrder, category, name);
        item.setRepeatType(repeatType != null ? repeatType : TodoItem.RepeatPattern.NONE);
        item.setRepeatDuration(repeatDuration != null ? repeatDuration : 0);
        item.setPriority(priority != null ? priority : 0);
        item.setLongTerm(longTerm != null ? longTerm : false);
        item.setAssignedTime(assignedTime);
        item.setReminderMinutesBefore(reminderMinutesBefore);

        TodoItem saved = touch(item);
        logger.info("Created new task with id: {}", saved.getId());
        return new TodoOperationResult("Added", saved);
    }

    public TodoOperationResult updateTaskField(long id, String field, String value) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isEmpty()) {
            logger.warn("Attempted to update non-existent task with id: {}", id);
            return new TodoOperationResult("Error: Item not found", null);
        }

        TodoItem item = optItem.get();
        if (item.isDeleted()) {
            return new TodoOperationResult("Error: Item not found", null);
        }
        boolean wasComplete = item.isComplete();
        LocalTime scheduledTime = item.getAssignedTime();
        try {
            switch (field) {
                case "taskName":
                    item.setName(value);
                    break;
                case "category":
                    item.setCategory(value);
                    break;
                case "taskDate":
                    item.setTaskDate(LocalDate.parse(value));
                    break;
                case "dayOrder":
                    item.setDayOrder(Integer.parseInt(value));
                    break;
                case "complete":
                    item.setComplete(Boolean.parseBoolean(value));
                    // Set assignedTime to current time when marking as complete
                    if (Boolean.parseBoolean(value)) {
                        item.setAssignedTime(
                                java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")).toLocalTime());
                    }
                    break;
                case "priority":
                    item.setPriority(Integer.parseInt(value));
                    break;
                case "repeatType":
                    item.setRepeatType(TodoItem.RepeatPattern.valueOf(value));
                    break;
                case "repeatDuration":
                    item.setRepeatDuration(Integer.parseInt(value));
                    break;
                case "assignedTime":
                    item.setAssignedTime(value.equals("null") ? null : java.time.LocalTime.parse(value));
                    break;
                case "inProgress":
                    item.setInProgress(Boolean.parseBoolean(value));
                    break;
                case "longTerm":
                    item.setLongTerm(Boolean.parseBoolean(value));
                    break;
                case "timeTaken":
                    item.setTimeTaken(Long.parseLong(value));
                    break;
                case "reminderMinutesBefore":
                    item.setReminderMinutesBefore(value.equals("null") ? null : Integer.parseInt(value));
                    break;
                default:
                    logger.warn("Invalid field update attempted: {}", field);
                    return new TodoOperationResult("Error: Invalid field", null);
            }

            TodoItem savedItem = touch(item);
            logger.info("Updated task {} field: {}", id, field);
            TodoItem nextItem = null;
            if (field.equals("complete") && !wasComplete && savedItem.isComplete()) {
                nextItem = createNextOccurrence(savedItem, scheduledTime);
            }
            return new TodoOperationResult("Updated", savedItem, nextItem);
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
            logger.error("Error updating task {}: {}", id, e.getMessage());
            return new TodoOperationResult("Error: " + e.getMessage(), null);
        }
    }

    /**
     * Replaces a task's editable fields in place, keeping its id and uuid so sync
     * clients see an edit rather than a delete plus a create. Progress fields
     * (complete, inProgress, timeTaken) are left alone.
     */
    public TodoOperationResult editTask(long id, String category, String name, LocalDate taskDate,
            TodoItem.RepeatPattern repeatType, Integer repeatDuration, Integer priority, Boolean longTerm,
            LocalTime assignedTime, Integer reminderMinutesBefore) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isEmpty() || optItem.get().isDeleted()) {
            logger.warn("Attempted to edit non-existent task with id: {}", id);
            return new TodoOperationResult("Error: Item not found", null);
        }

        TodoItem item = optItem.get();
        if (!Objects.equals(item.getTaskDate(), taskDate)) {
            // Moving to another day puts the task at the end of that day
            item.setDayOrder(activeOn(taskDate).size() + 1);
        }
        item.setCategory(category);
        item.setName(name);
        item.setTaskDate(taskDate);
        item.setRepeatType(repeatType != null ? repeatType : TodoItem.RepeatPattern.NONE);
        item.setRepeatDuration(repeatDuration != null ? repeatDuration : 0);
        item.setPriority(priority != null ? priority : 0);
        item.setLongTerm(longTerm != null ? longTerm : false);
        item.setAssignedTime(assignedTime);
        item.setReminderMinutesBefore(reminderMinutesBefore);

        TodoItem saved = touch(item);
        logger.info("Edited task with id: {}", id);
        return new TodoOperationResult("Updated", saved);
    }

    public boolean deleteTask(Long id) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isPresent()) {
            TodoItem item = optItem.get();
            if (item.isDeleted()) {
                return false;
            }
            // Soft delete: the tombstone lets sync clients remove their copy
            item.setDeleted(true);
            touch(item);
            logger.info("Deleted task with id: {}", id);
            return item.isComplete();
        } else {
            logger.warn("Attempted to delete non-existent task with id: {}", id);
            return false;
        }
    }

    private List<TodoItem> activeOn(LocalDate date) {
        return repository.findByTaskDate(date).stream()
                .filter(t -> !t.isDeleted())
                .collect(Collectors.toList());
    }

    /**
     * Creates the next occurrence of a just-completed recurring task. Skips it when
     * a task with the same name and category already exists on that date, so
     * un-ticking and re-ticking does not create duplicates.
     *
     * @param scheduledTime the task's time before completion overwrote assignedTime
     */
    TodoItem createNextOccurrence(TodoItem completed, LocalTime scheduledTime) {
        Optional<LocalDate> next = RecurrenceCalculator.nextDate(
                completed.getTaskDate(), completed.getRepeatType(), completed.getRepeatDuration());
        if (next.isEmpty()) {
            return null;
        }
        LocalDate nextDate = next.get();
        boolean duplicate = activeOn(nextDate).stream().anyMatch(t -> Objects.equals(t.getName(), completed.getName())
                && Objects.equals(t.getCategory(), completed.getCategory())
                && !Objects.equals(t.getId(), completed.getId()));
        if (duplicate) {
            logger.info("Recurring task {} already exists on {}", completed.getId(), nextDate);
            return null;
        }
        TodoItem created = addTask(completed.getCategory(), completed.getName(), nextDate,
                completed.getRepeatType(), completed.getRepeatDuration(), completed.getPriority(),
                completed.isLongTerm(), scheduledTime, completed.getReminderMinutesBefore()).getItem();
        logger.info("Created next occurrence {} of task {} on {}", created.getId(), completed.getId(), nextDate);
        return created;
    }
}
