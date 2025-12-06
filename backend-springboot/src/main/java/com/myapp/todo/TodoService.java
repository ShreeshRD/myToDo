package com.myapp.todo;

import com.myapp.todo.dto.TodoOperationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import java.util.LinkedHashMap;

@Service
public class TodoService {

    private static final Logger logger = LoggerFactory.getLogger(TodoService.class);

    @Autowired
    private TodoItemRepository repository;

    public GroupedTodoItems getGroupedByDate() {
        Iterable<TodoItem> todoList = repository.findAll();
        Map<String, List<TodoItem>> itemsByDate = StreamSupport.stream(todoList.spliterator(), false)
                .collect(Collectors.groupingBy(item -> item.getTaskDate().toString()));

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

    public TodoOperationResult addTask(String category, String name, LocalDate taskDate,
            TodoItem.RepeatPattern repeatType, Integer repeatDuration, Integer priority) {
        // Calculate next order for the task date
        List<TodoItem> existingTasks = repository.findByTaskDate(taskDate);
        int nextOrder = existingTasks.size() + 1;

        // Create and populate the task
        TodoItem item = new TodoItem(taskDate, nextOrder, category, name);
        item.setRepeatType(repeatType != null ? repeatType : TodoItem.RepeatPattern.NONE);
        item.setRepeatDuration(repeatDuration != null ? repeatDuration : 0);
        item.setPriority(priority != null ? priority : 0);

        TodoItem saved = repository.save(item);
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
                default:
                    logger.warn("Invalid field update attempted: {}", field);
                    return new TodoOperationResult("Error: Invalid field", null);
            }

            TodoItem savedItem = repository.save(item);
            logger.info("Updated task {} field: {}", id, field);
            return new TodoOperationResult("Updated", savedItem);
        } catch (Exception e) {
            logger.error("Error updating task {}: {}", id, e.getMessage());
            return new TodoOperationResult("Error: " + e.getMessage(), null);
        }
    }

    public boolean deleteTask(Long id) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isPresent()) {
            TodoItem item = optItem.get();
            repository.deleteById(id);
            logger.info("Deleted task with id: {}", id);
            return item.isComplete();
        } else {
            logger.warn("Attempted to delete non-existent task with id: {}", id);
            return false;
        }
    }
}