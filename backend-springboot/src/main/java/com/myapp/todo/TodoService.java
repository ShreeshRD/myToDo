package com.myapp.todo;

import com.myapp.todo.dto.ProjectCount;
import com.myapp.todo.dto.PushResult;
import com.myapp.todo.dto.TaskCounts;
import com.myapp.todo.dto.TaskQuery;
import com.myapp.todo.dto.TodoOperationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    @Autowired
    private TaskEventService taskEventService;

    @Autowired
    private SubtaskService subtaskService;

    @Autowired
    private GoalRepository goalRepository;

    private static final Set<String> TIMELINE_FIELDS = Set.of(
            "taskName", "category", "taskDate", "priority", "repeatType", "repeatDuration", "description", "longTerm", "goalId", "roadmapOrder");

    public GroupedTodoItems getGroupedByDate() {
        Iterable<TodoItem> todoList = repository.findAll();
        // Undated roadmap steps (taskDate == null) are backlog and must never
        // appear in day lists.
        Map<String, List<TodoItem>> itemsByDate = StreamSupport.stream(todoList.spliterator(), false)
                .filter(item -> item.getTaskDate() != null)
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
            TodoItem.RepeatPattern repeatType, Integer repeatDuration, Integer priority, Boolean longTerm,
            Long goalId) {
        // Calculate next order for the task date
        List<TodoItem> existingTasks = repository.findByTaskDate(taskDate);
        int nextOrder = existingTasks.size() + 1;

        // Create and populate the task
        TodoItem item = new TodoItem(taskDate, nextOrder, category, name);
        item.setRepeatType(repeatType != null ? repeatType : TodoItem.RepeatPattern.NONE);
        item.setRepeatDuration(repeatDuration != null ? repeatDuration : 0);
        item.setPriority(priority != null ? priority : 0);
        item.setLongTerm(longTerm != null ? longTerm : false);
        if (goalId != null) {
            requireLinkableGoalOrHttp(goalId);
            item.setGoalId(goalId);
            // Linking a task to a goal marks it as growth work.
            item.setLongTerm(true);
        }

        TodoItem saved = repository.save(item);
        // Timeline is best-effort: a failed CREATED row must not report the
        // committed add as failed (the client would retry and duplicate the task).
        try {
            taskEventService.record(saved.getId(), "CREATED", "Task created");
        } catch (RuntimeException e) {
            logger.warn("Failed to record CREATED event for task {}: {}", saved.getId(), e.getMessage());
        }
        logger.info("Created new task with id: {}", saved.getId());
        return new TodoOperationResult("Added", saved);
    }

    /**
     * Tasks may link only to {@code kind=GOAL} records; skills never link to tasks.
     * Throws {@link IllegalArgumentException} so field-update paths can return
     * a normal error result; callers that surface HTTP errors convert as needed.
     */
    private void requireLinkableGoal(Long goalId) {
        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found"));
        if (goal.getKind() != Goal.Kind.GOAL) {
            throw new IllegalArgumentException("Skills cannot be linked to tasks");
        }
    }

    private void requireLinkableGoalOrHttp(Long goalId) {
        try {
            requireLinkableGoal(goalId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    "Goal not found".equals(e.getMessage()) ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST,
                    e.getMessage());
        }
    }

    /**
     * "Not in my hands": complete the task now, record why and where it moved,
     * then create a deferred clone for the chosen date. Only unchecked checklist
     * rows move to the clone; checked ones stay with the completed original.
     * Recursion is deliberately suppressed for this occurrence — the clone is
     * the next occurrence, and it keeps the repeat settings for later.
     */
    public PushResult pushTask(Long id, String reason, LocalDate destination) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        TodoItem original = optItem.get();
        if (original.isComplete()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task is already complete");
        }
        String trimmedReason = reason == null ? "" : reason.trim();
        if (trimmedReason.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reason is required");
        }
        LocalDate today = LocalDate.now(COMPLETION_ZONE);
        LocalDate target = destination != null ? destination : today.plusDays(1);
        if (target.isBefore(today)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Destination date must be today or later");
        }

        int nextPushCount = (original.getPushCount() == null ? 0 : original.getPushCount()) + 1;
        Long previousChainRootId = original.getChainRootId();
        Integer previousRoadmapOrder = original.getRoadmapOrder();
        Integer previousPushCount = original.getPushCount();
        boolean previousInProgress = original.isInProgress();
        LocalDateTime completedAt = LocalDateTime.now(COMPLETION_ZONE);

        // Atomic claim: only one concurrent push may complete an open task.
        int claimed = repository.markCompleteIfOpen(id, completedAt);
        if (claimed == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task is already complete");
        }

        if (previousChainRootId == null) {
            original.setChainRootId(original.getId());
        }
        original.setPushCount(nextPushCount);
        original.setComplete(true);
        original.setCompletedAt(completedAt);
        original.setInProgress(false);
        // Pushing a roadmap step must not tick it: the order moves to the clone
        // so the step stays pending; the original is completed history only.
        original.setRoadmapOrder(null);

        TodoItem savedClone = null;
        try {
            TodoItem savedOriginal = repository.save(original);
            recordBestEffort(() -> taskEventService.record(id, "PUSHED", "Pushed: " + trimmedReason,
                    original.getTaskDate(), target));

            TodoItem clone = new TodoItem(target, nextOrderFor(target), original.getCategory(), original.getName());
            clone.setPriority(original.getPriority());
            clone.setLongTerm(original.isLongTerm());
            clone.setDescription(original.getDescription());
            clone.setRepeatType(original.getRepeatType());
            clone.setRepeatDuration(original.getRepeatDuration());
            clone.setGoalId(original.getGoalId());
            clone.setChainRootId(original.getChainRootId());
            clone.setPushedFromId(original.getId());
            clone.setPushCount(nextPushCount);
            clone.setRoadmapOrder(previousRoadmapOrder);
            TodoItem persistedClone = repository.save(clone);
            savedClone = persistedClone;
            Long cloneId = persistedClone.getId();
            recordBestEffort(() -> taskEventService.record(cloneId, "CREATED",
                    "Deferred copy of pushed task " + id));

            for (Subtask subtask : subtaskService.listForTask(id)) {
                if (!subtask.isDone()) {
                    subtaskService.create(persistedClone.getId(), subtask.getTitle());
                }
            }

            logger.info("Pushed task {} to {} (deferred copy {})", id, target, persistedClone.getId());
            return new PushResult("Pushed", savedOriginal, persistedClone);
        } catch (RuntimeException e) {
            // Compensate: leave the original open so the client can retry cleanly.
            if (savedClone != null) {
                try {
                    repository.deleteById(savedClone.getId());
                    taskEventService.deleteForTask(savedClone.getId());
                    subtaskService.deleteForTask(savedClone.getId());
                } catch (RuntimeException cleanupError) {
                    logger.error("Failed to clean up clone after push failure for task {}: {}",
                            id, cleanupError.getMessage());
                }
            }
            original.setComplete(false);
            original.setCompletedAt(null);
            original.setPushCount(previousPushCount);
            original.setChainRootId(previousChainRootId);
            original.setRoadmapOrder(previousRoadmapOrder);
            original.setInProgress(previousInProgress);
            try {
                repository.save(original);
            } catch (RuntimeException restoreError) {
                logger.error("Failed to restore task {} after push failure: {}", id, restoreError.getMessage());
            }
            logger.error("Push of task {} failed and was rolled back: {}", id, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Push failed; the task was left open so you can retry", e);
        }
    }

    private void recordBestEffort(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            logger.warn("Timeline write failed: {}", e.getMessage());
        }
    }

    private int nextOrderFor(LocalDate date) {
        return repository.findByTaskDate(date).size() + 1;
    }

    /**
     * Re-opening a pushed task removes its deferred copy when that copy is still
     * untouched. A copy with activity (timeline events, tracked time, completed
     * checklist rows, or completion) is left alone and reported to the caller.
     */
    private String releaseDeferredClones(Long taskId) {
        // Lookup failures propagate so the reopen path can fail closed instead
        // of reporting Updated while cleanup is unfinished.
        List<TodoItem> clones = repository.findByPushedFromId(taskId);
        boolean kept = false;
        for (TodoItem clone : clones) {
            if (isUntouchedClone(clone)) {
                // If the clone carried a roadmap step, put it back on the original
                // so reopening does not silently drop the step from the roadmap.
                if (clone.getRoadmapOrder() != null) {
                    Optional<TodoItem> originalOpt = repository.findById(taskId);
                    if (originalOpt.isPresent()) {
                        TodoItem original = originalOpt.get();
                        original.setRoadmapOrder(clone.getRoadmapOrder());
                        repository.save(original);
                    }
                }
                repository.deleteById(clone.getId());
                taskEventService.deleteForTask(clone.getId());
                subtaskService.deleteForTask(clone.getId());
                logger.info("Removed deferred copy {} of reopened task {}", clone.getId(), taskId);
            } else {
                kept = true;
            }
        }
        return kept ? "The deferred copy has activity, so it was kept" : null;
    }

    private boolean isUntouchedClone(TodoItem clone) {
        if (clone.isComplete()) {
            return false;
        }
        if (clone.getTimeTaken() != null && clone.getTimeTaken() > 0) {
            return false;
        }
        if (taskEventService.countActivity(clone.getId()) > 0) {
            return false;
        }
        return subtaskService.listForTask(clone.getId()).stream().noneMatch(Subtask::isDone);
    }

    public TodoOperationResult updateTaskField(long id, String field, String value) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isEmpty()) {
            logger.warn("Attempted to update non-existent task with id: {}", id);
            return new TodoOperationResult("Error: Item not found", null);
        }

        TodoItem item = optItem.get();
        try {
            boolean wasComplete = item.isComplete();
            java.time.LocalDateTime previousCompletedAt = item.getCompletedAt();
            applyField(item, field, value);
            TodoItem savedItem = repository.save(item);
            recordFieldEvent(id, field, savedItem);
            String warning = null;
            if ("complete".equals(field) && wasComplete && !savedItem.isComplete()) {
                warning = releaseDeferredClonesOrRestore(id, item, wasComplete, previousCompletedAt);
            }
            logger.info("Updated task {} field: {}", id, field);
            TodoOperationResult result = new TodoOperationResult("Updated", savedItem);
            result.setWarning(warning);
            if ("complete".equals(field) && !wasComplete && savedItem.isComplete()) {
                result.setNextTask(generateNextOccurrence(savedItem));
            }
            return result;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
            logger.error("Error updating task {}: {}", id, e.getMessage());
            return new TodoOperationResult("Error: " + e.getMessage(), null);
        }
    }

    /**
     * Runs deferred-copy cleanup after a reopen has already been saved. If
     * cleanup fails, restores the completed state (including the original
     * completion timestamp) so a retry can finish the operation instead of
     * leaving an open task with orphaned clones.
     */
    private String releaseDeferredClonesOrRestore(Long id, TodoItem item, boolean wasComplete,
            java.time.LocalDateTime previousCompletedAt) {
        try {
            return releaseDeferredClones(id);
        } catch (RuntimeException e) {
            logger.error("Deferred-copy cleanup failed for task {}: {}", id, e.getMessage());
            item.setComplete(wasComplete);
            if (wasComplete) {
                // Prefer the pre-reopen timestamp; never invent "now" here.
                item.setCompletedAt(previousCompletedAt);
            }
            try {
                repository.save(item);
            } catch (RuntimeException restoreError) {
                logger.error("Failed to restore task {} after cleanup failure: {}",
                        id, restoreError.getMessage());
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not release deferred copies; the task was left complete so you can retry", e);
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
            boolean wasComplete = item.isComplete();
            java.time.LocalDateTime previousCompletedAt = item.getCompletedAt();
            Set<String> editedFields = new LinkedHashSet<>();
            boolean completeChanged = false;
            if (fields != null) {
                for (Map.Entry<String, String> entry : fields.entrySet()) {
                    applyField(item, entry.getKey(), entry.getValue());
                    if ("complete".equals(entry.getKey())) {
                        completeChanged = true;
                    } else if (TIMELINE_FIELDS.contains(entry.getKey())) {
                        editedFields.add(timelineLabel(entry.getKey()));
                    }
                }
            }
            // Field order must not matter: a linked task is always long-term.
            if (item.getGoalId() != null) {
                item.setLongTerm(true);
            }
            TodoItem savedItem = repository.save(item);
            // Timeline writes are best-effort so a failed event row cannot skip
            // recurrence generation or deferred-clone cleanup below.
            try {
                if (completeChanged) {
                    recordCompletionEvent(id, savedItem.isComplete());
                }
                if (!editedFields.isEmpty()) {
                    recordEditEvent(id, String.join(", ", editedFields));
                }
            } catch (RuntimeException e) {
                logger.warn("Failed to record timeline event for task {}: {}", id, e.getMessage());
            }
            String warning = null;
            if (completeChanged && wasComplete && !savedItem.isComplete()) {
                warning = releaseDeferredClonesOrRestore(id, item, wasComplete, previousCompletedAt);
            }
            logger.info("Patched task {} with {} field(s)", id, fields == null ? 0 : fields.size());
            TodoOperationResult result = new TodoOperationResult("Updated", savedItem);
            result.setWarning(warning);
            if (completeChanged && !wasComplete && savedItem.isComplete()) {
                result.setNextTask(generateNextOccurrence(savedItem));
            }
            return result;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
            logger.error("Error patching task {}: {}", id, e.getMessage());
            return new TodoOperationResult("Error: " + e.getMessage(), null);
        }
    }

    /**
     * Completing a recurring task creates its next occurrence on the computed
     * date. The clone keeps name, project, priority, longTerm, description, and
     * repeat settings. A same-name/same-project/same-day row already in the DB
     * suppresses creation so repeated completions cannot pile up duplicates.
     * Push never reaches this path — its clone is the next occurrence.
     */
    private TodoItem generateNextOccurrence(TodoItem source) {
        TodoItem.RepeatPattern pattern = source.getRepeatType();
        if (pattern == null || pattern == TodoItem.RepeatPattern.NONE) {
            return null;
        }
        Integer duration = source.getRepeatDuration();
        if (duration == null || duration <= 0) {
            logger.info("Skipping next occurrence for task {}: invalid repeat rule", source.getId());
            return null;
        }
        LocalDate nextDate = nextOccurrenceDate(source.getTaskDate(), pattern, duration);
        if (nextDate == null) {
            logger.info("Skipping next occurrence for task {}: cannot compute next date", source.getId());
            return null;
        }
        if (hasOccurrenceOn(source, nextDate)) {
            logger.info("Next occurrence of task {} already exists on {}", source.getId(), nextDate);
            return null;
        }

        TodoItem next = new TodoItem(nextDate, nextOrderFor(nextDate), source.getCategory(), source.getName());
        next.setPriority(source.getPriority());
        next.setLongTerm(source.isLongTerm());
        next.setDescription(source.getDescription());
        next.setRepeatType(source.getRepeatType());
        next.setRepeatDuration(source.getRepeatDuration());
        // Recurrence is never a roadmap step — roadmapOrder stays with the step chain.
        next.setGoalId(source.getGoalId());
        try {
            TodoItem saved = repository.save(next);
            taskEventService.record(saved.getId(), "CREATED",
                    "Next occurrence of task " + source.getId());
            logger.info("Created next occurrence {} of task {} on {}", saved.getId(), source.getId(), nextDate);
            return saved;
        } catch (RuntimeException e) {
            logger.error("Failed to create next occurrence of task {}: {}", source.getId(), e.getMessage());
            return null;
        }
    }

    private boolean hasOccurrenceOn(TodoItem source, LocalDate date) {
        String sourceName = source.getName() == null ? null : source.getName().trim();
        String sourceCategory = projectName(source);
        return repository.findByTaskDate(date).stream()
                .filter(t -> !t.getId().equals(source.getId()))
                .anyMatch(t -> equalsIgnoreCase(sourceName, t.getName())
                        && equalsIgnoreCase(sourceCategory, projectName(t)));
    }

    /**
     * Shared date math for every recurrence pattern. Month steps use
     * {@link LocalDate#plusMonths} so Jan 31 + 1 month lands on the last day
     * of February rather than overflowing.
     */
    static LocalDate nextOccurrenceDate(LocalDate from, TodoItem.RepeatPattern pattern, int duration) {
        if (from == null || pattern == null || duration <= 0) {
            return null;
        }
        switch (pattern) {
            case EVERY_X_DAYS:
                return from.plusDays(duration);
            case EVERY_X_WEEKS:
                return from.plusWeeks(duration);
            case EVERY_X_MONTHS:
                return from.plusMonths(duration);
            case SPECIFIC_WEEKDAYS:
                return nextSpecificWeekday(from, duration);
            default:
                return null;
        }
    }

    /**
     * Weekday mask matches the frontend/MCP bit layout: bit 6 (value 64) is
     * Monday … bit 0 (value 1) is Sunday, encoded as a 7-char binary string
     * where index 0 is Monday.
     */
    private static LocalDate nextSpecificWeekday(LocalDate from, int mask) {
        if (mask > 127) {
            return null;
        }
        String bits = String.format("%7s", Integer.toBinaryString(mask)).replace(' ', '0');
        LocalDate cursor = from;
        for (int i = 0; i < 7; i++) {
            cursor = cursor.plusDays(1);
            // Java DOW: MON=1..SAT=6, SUN=7 → map to Mon=0..Sun=6
            int dayIndex = cursor.getDayOfWeek() == java.time.DayOfWeek.SUNDAY ? 6
                    : cursor.getDayOfWeek().getValue() - 1;
            if (bits.charAt(dayIndex) == '1') {
                return cursor;
            }
        }
        return null;
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
                // "null" clears the date so a roadmap step returns to backlog.
                if (value == null || value.isBlank() || "null".equals(value)) {
                    item.setTaskDate(null);
                } else {
                    LocalDate newDate = LocalDate.parse(value);
                    if (!newDate.equals(item.getTaskDate())) {
                        item.setTaskDate(newDate);
                        item.setDayOrder(nextOrderFor(newDate));
                    }
                }
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
            case "goalId":
                applyGoalId(item, value);
                break;
            case "roadmapOrder":
                if (value == null || value.isBlank() || "null".equals(value)) {
                    item.setRoadmapOrder(null);
                } else {
                    try {
                        item.setRoadmapOrder(Integer.parseInt(value.trim()));
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid roadmapOrder");
                    }
                }
                break;
            default:
                logger.warn("Invalid field update attempted: {}", field);
                throw new IllegalArgumentException("Invalid field");
        }
    }

    /**
     * Linking sets the goal and forces longTerm on. Unlinking clears only the
     * goal — longTerm is never auto-cleared.
     */
    private void applyGoalId(TodoItem item, String value) {
        if (value == null || value.isBlank() || "null".equals(value)) {
            item.setGoalId(null);
            // An unlinked task is no longer part of any roadmap.
            item.setRoadmapOrder(null);
            return;
        }
        long goalId;
        try {
            goalId = Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid goalId");
        }
        requireLinkableGoal(goalId);
        item.setGoalId(goalId);
        item.setLongTerm(true);
    }

    private void recordFieldEvent(Long taskId, String field, TodoItem item) {
        try {
            if ("complete".equals(field)) {
                recordCompletionEvent(taskId, item.isComplete());
            } else if (TIMELINE_FIELDS.contains(field)) {
                recordEditEvent(taskId, timelineLabel(field));
            }
        } catch (RuntimeException e) {
            // Timeline writes must never break the actual task mutation.
            logger.warn("Failed to record event for task {}: {}", taskId, e.getMessage());
        }
    }

    private void recordCompletionEvent(Long taskId, boolean complete) {
        if (complete) {
            taskEventService.record(taskId, "COMPLETED", "Marked complete");
        } else {
            taskEventService.record(taskId, "UNCOMPLETED", "Reopened");
        }
    }

    private void recordEditEvent(Long taskId, String fields) {
        taskEventService.record(taskId, "EDITED", "Updated " + fields);
    }

    private String timelineLabel(String field) {
        switch (field) {
            case "taskName":
                return "name";
            case "category":
                return "project";
            case "taskDate":
                return "date";
            case "repeatType":
            case "repeatDuration":
                return "repeat";
            case "longTerm":
                return "long-term flag";
            case "goalId":
                return "goal";
            case "roadmapOrder":
                return "roadmap position";
            default:
                return field;
        }
    }

    /**
     * Delete-only: one transaction so a mid-cleanup failure rolls back the
     * task delete and a retry can remove every child row.
     */
    @Transactional
    public boolean deleteTask(Long id) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isPresent()) {
            TodoItem item = optItem.get();
            repository.deleteById(id);
            taskEventService.deleteForTask(id);
            subtaskService.deleteForTask(id);
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
        // Undated backlog steps sort first on asc (nullsFirst) without NPE.
        Comparator<TodoItem> byDateThenId = Comparator
                .comparing(TodoItem::getTaskDate, Comparator.nullsFirst(Comparator.naturalOrder()))
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
                // Undated backlog steps only match when no date window is requested.
                .filter(item -> (start == null && end == null) || item.getTaskDate() != null)
                .filter(item -> start == null || (item.getTaskDate() != null && !item.getTaskDate().isBefore(start)))
                .filter(item -> end == null || (item.getTaskDate() != null && !item.getTaskDate().isAfter(end)))
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