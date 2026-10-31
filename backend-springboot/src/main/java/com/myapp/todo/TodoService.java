package com.myapp.todo;

import com.myapp.todo.dto.ProjectCount;
import com.myapp.todo.dto.TaskCounts;
import com.myapp.todo.dto.TaskQuery;
import com.myapp.todo.dto.TodoOperationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import java.util.Comparator;
import java.util.LinkedHashMap;

@Service
public class TodoService {

    private static final Logger logger = LoggerFactory.getLogger(TodoService.class);
    private static final ZoneId COMPLETION_ZONE = ZoneId.of("Asia/Kolkata");

    @Autowired
    private TodoItemRepository repository;

    public GroupedTodoItems getGroupedByDate() {
        Iterable<TodoItem> todoList = repository.findAll();
        Map<String, List<TodoItem>> itemsByDate = StreamSupport.stream(todoList.spliterator(), false)
                .collect(Collectors.groupingBy(
                        item -> item.getTaskDate().toString(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    list.sort(Comparator.comparingInt(TodoItem::getDayOrder));
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

    public TodoOperationResult addTask(String category, String name, LocalDate taskDate,
            TodoItem.RepeatPattern repeatType, Integer repeatDuration, Integer priority, Boolean longTerm) {
        // Calculate next order for the task date
        List<TodoItem> existingTasks = repository.findByTaskDate(taskDate);
        int nextOrder = existingTasks.size() + 1;

        // Create and populate the task
        TodoItem item = new TodoItem(taskDate, nextOrder, category, name);
        item.setRepeatType(repeatType != null ? repeatType : TodoItem.RepeatPattern.NONE);
        item.setRepeatDuration(repeatDuration != null ? repeatDuration : 0);
        item.setPriority(priority != null ? priority : 0);
        item.setLongTerm(longTerm != null ? longTerm : false);

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
            applyField(item, field, value);
            TodoItem savedItem = repository.save(item);
            logger.info("Updated task {} field: {}", id, field);
            return new TodoOperationResult("Updated", savedItem);
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
            logger.error("Error updating task {}: {}", id, e.getMessage());
            return new TodoOperationResult("Error: " + e.getMessage(), null);
        }
    }

    /**
     * Applies several field updates in one transaction. Used by the edit popup so a
     * task keeps its identity instead of being recreated.
     */
    public TodoOperationResult patchTask(Long id, Map<String, String> fields) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isEmpty()) {
            logger.warn("Attempted to patch non-existent task with id: {}", id);
            return new TodoOperationResult("Error: Item not found", null);
        }

        TodoItem item = optItem.get();
        try {
            if (fields != null) {
                for (Map.Entry<String, String> entry : fields.entrySet()) {
                    applyField(item, entry.getKey(), entry.getValue());
                }
            }
            TodoItem savedItem = repository.save(item);
            logger.info("Patched task {} with {} field(s)", id, fields == null ? 0 : fields.size());
            return new TodoOperationResult("Updated", savedItem);
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
            logger.error("Error patching task {}: {}", id, e.getMessage());
            return new TodoOperationResult("Error: " + e.getMessage(), null);
        }
    }

    private void applyField(TodoItem item, String field, String rawValue) {
        String value = rawValue == null ? "null" : rawValue;
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
                boolean completed = Boolean.parseBoolean(value);
                item.setComplete(completed);
                // Completion is an event: record when it happened without destroying
                // the scheduled time.
                item.setCompletedAt(completed ? LocalDateTime.now(COMPLETION_ZONE) : null);
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
            case "description":
                item.setDescription(value.equals("null") ? null : value);
                break;
            default:
                logger.warn("Invalid field update attempted: {}", field);
                throw new IllegalArgumentException("Invalid field");
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

    // Query filtering is intentionally in-memory (findAll + filter). Acceptable until
    // the dataset grows beyond roughly 10k tasks; current prod is ~519 rows.
    public List<TodoItem> queryTasks(TaskQuery query) {
        validateQuery(query);
        Comparator<TodoItem> byDateThenId = Comparator
                .comparing(TodoItem::getTaskDate)
                .thenComparing(TodoItem::getId);
        if ("desc".equals(normalizeOrder(query.getOrder()))) {
            byDateThenId = byDateThenId.reversed();
        }
        return filterTasks(query)
                .sorted(byDateThenId)
                .limit(normalizeLimit(query.getLimit()))
                .collect(Collectors.toList());
    }

    public TaskCounts countTasks(TaskQuery query) {
        validateQuery(query);
        List<TodoItem> filtered = filterTasks(query).collect(Collectors.toList());
        long completed = filtered.stream().filter(TodoItem::isComplete).count();
        long count = filtered.size();
        return new TaskCounts(count, count - completed, completed);
    }

    public Optional<TodoItem> getTask(long id) {
        return repository.findById(id);
    }

    public List<ProjectCount> getProjectCounts() {
        Map<String, Long> counts = StreamSupport.stream(repository.findAll().spliterator(), false)
                .collect(Collectors.groupingBy(this::projectName, Collectors.counting()));
        List<ProjectCount> result = new ArrayList<>();
        counts.forEach((name, count) -> result.add(new ProjectCount(name, count)));
        result.sort(Comparator.comparingLong(ProjectCount::getCount).reversed()
                .thenComparing(ProjectCount::getName));
        return result;
    }

    private Stream<TodoItem> filterTasks(TaskQuery query) {
        String q = blankToNull(query.getQ());
        String exactName = blankToNull(query.getExactName());
        String project = blankToNull(query.getProject());
        String status = normalizeStatus(query.getStatus());
        Boolean recurring = query.getRecurring();
        LocalDate start = query.getStart();
        LocalDate end = query.getEnd();

        return StreamSupport.stream(repository.findAll().spliterator(), false)
                .filter(item -> q == null || containsIgnoreCase(item.getName(), q))
                .filter(item -> exactName == null || equalsIgnoreCase(item.getName(), exactName))
                .filter(item -> project == null || equalsIgnoreCase(projectName(item), project))
                .filter(item -> start == null || !item.getTaskDate().isBefore(start))
                .filter(item -> end == null || !item.getTaskDate().isAfter(end))
                .filter(item -> {
                    if ("open".equals(status)) {
                        return !item.isComplete();
                    }
                    if ("completed".equals(status)) {
                        return item.isComplete();
                    }
                    return true;
                })
                .filter(item -> {
                    if (recurring == null) {
                        return true;
                    }
                    return recurring == isRecurring(item);
                });
    }

    private void validateQuery(TaskQuery query) {
        String status = normalizeStatus(query.getStatus());
        if (!status.equals("all") && !status.equals("open") && !status.equals("completed")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be all, open, or completed");
        }
        String order = normalizeOrder(query.getOrder());
        if (!order.equals("asc") && !order.equals("desc")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "order must be asc or desc");
        }
        if (query.getStart() != null && query.getEnd() != null && query.getStart().isAfter(query.getEnd())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "start must be on or before end");
        }
        query.setQ(blankToNull(query.getQ()));
        query.setExactName(blankToNull(query.getExactName()));
        query.setProject(blankToNull(query.getProject()));
        query.setStatus(status);
        query.setOrder(order);
        query.setLimit(normalizeLimit(query.getLimit()));
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "all";
        }
        return status.trim().toLowerCase();
    }

    private String normalizeOrder(String order) {
        if (order == null || order.isBlank()) {
            return "asc";
        }
        return order.trim().toLowerCase();
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return 100;
        }
        if (limit < 1) {
            return 1;
        }
        if (limit > 500) {
            return 500;
        }
        return limit;
    }

    private String projectName(TodoItem item) {
        if (item.getCategory() == null || item.getCategory().isBlank()) {
            return "None";
        }
        return item.getCategory().trim();
    }

    private boolean isRecurring(TodoItem item) {
        return item.getRepeatType() != null && item.getRepeatType() != TodoItem.RepeatPattern.NONE;
    }

    private boolean containsIgnoreCase(String value, String needle) {
        if (value == null) {
            return false;
        }
        return value.toLowerCase().contains(needle.toLowerCase());
    }

    private boolean equalsIgnoreCase(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return left.trim().equalsIgnoreCase(right.trim());
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}