package com.myapp.todo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class TaskEventService {

    private static final ZoneId EVENT_ZONE = ZoneId.of("Asia/Kolkata");

    private final TaskEventRepository repository;

    public TaskEventService(TaskEventRepository repository) {
        this.repository = repository;
    }

    public TaskEvent record(Long taskId, String type, String detail) {
        return record(taskId, type, detail, null, null);
    }

    public TaskEvent record(Long taskId, String type, String detail, LocalDate fromDate, LocalDate toDate) {
        return recordAt(taskId, type, detail, LocalDateTime.now(EVENT_ZONE), fromDate, toDate);
    }

    public TaskEvent recordAt(Long taskId, String type, String detail, LocalDateTime createdAt) {
        return recordAt(taskId, type, detail, createdAt, null, null);
    }

    private TaskEvent recordAt(Long taskId, String type, String detail, LocalDateTime createdAt,
            LocalDate fromDate, LocalDate toDate) {
        TaskEvent event = new TaskEvent(taskId, type, detail, createdAt);
        event.setFromDate(fromDate);
        event.setToDate(toDate);
        return repository.save(event);
    }

    public List<TaskEvent> listForTask(Long taskId) {
        return repository.findByTaskIdOrderByCreatedAtAscIdAsc(taskId);
    }

    public boolean hasEvents(Long taskId) {
        return repository.countByTaskId(taskId) > 0;
    }

    /**
     * Counts timeline activity beyond the initial CREATED row. Used to decide
     * whether a deferred clone is still untouched when its parent is reopened.
     */
    public long countActivity(Long taskId) {
        return repository.countByTaskIdAndTypeNot(taskId, "CREATED");
    }

    @Transactional
    public void deleteForTask(Long taskId) {
        repository.deleteByTaskId(taskId);
    }
}
