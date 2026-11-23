package com.myapp.todo;

import com.myapp.todo.dto.SubtaskCount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SubtaskService {

    private static final Logger logger = LoggerFactory.getLogger(SubtaskService.class);

    private final SubtaskRepository repository;
    private final TodoItemRepository taskRepository;

    public SubtaskService(SubtaskRepository repository, TodoItemRepository taskRepository) {
        this.repository = repository;
        this.taskRepository = taskRepository;
    }

    public List<Subtask> listForTask(Long taskId) {
        return repository.findByTaskIdOrderBySortOrderAscIdAsc(taskId);
    }

    /** Totals for the checklist badge on each task row. */
    public List<SubtaskCount> counts() {
        Map<Long, SubtaskCount> byTask = new HashMap<>();
        for (Subtask subtask : repository.findAll()) {
            SubtaskCount count = byTask.computeIfAbsent(subtask.getTaskId(),
                    id -> new SubtaskCount(id, 0, 0));
            count.setTotal(count.getTotal() + 1);
            if (subtask.isDone()) {
                count.setDone(count.getDone() + 1);
            }
        }
        return new ArrayList<>(byTask.values());
    }

    // No @Transactional on create/update/reorder: on SQLite the outer
    // transaction holds a read lock, while Hibernate's table-sequence
    // generator needs to commit on a second connection. That self-locks and
    // fails with SQLITE_BUSY. Each repository call keeps its own transaction.
    public Subtask create(Long taskId, String title) {
        if (taskId == null || !taskRepository.existsById(taskId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        String trimmed = cleanTitle(title);
        int nextOrder = (int) repository.countByTaskId(taskId);
        Subtask saved = repository.save(new Subtask(taskId, trimmed, nextOrder));
        logger.info("Added subtask {} to task {}", saved.getId(), taskId);
        return saved;
    }

    public Subtask update(Long id, Map<String, String> fields) {
        Subtask subtask = find(id);
        if (fields != null) {
            if (fields.containsKey("title")) {
                subtask.setTitle(cleanTitle(fields.get("title")));
            }
            if (fields.containsKey("done")) {
                subtask.setDone(Boolean.parseBoolean(fields.get("done")));
            }
        }
        return repository.save(subtask);
    }

    public List<Subtask> reorder(Long taskId, List<Long> orderedIds) {
        if (orderedIds == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ids are required");
        }
        List<Subtask> subtasks = repository.findByTaskIdOrderBySortOrderAscIdAsc(taskId);
        Map<Long, Subtask> byId = new HashMap<>();
        for (Subtask subtask : subtasks) {
            byId.put(subtask.getId(), subtask);
        }
        int order = 0;
        for (Long id : orderedIds) {
            Subtask subtask = byId.remove(id);
            if (subtask != null) {
                subtask.setSortOrder(order++);
            }
        }
        // Any rows the client did not mention keep their relative order at the end.
        for (Subtask leftover : byId.values()) {
            leftover.setSortOrder(order++);
        }
        repository.saveAll(subtasks);
        return repository.findByTaskIdOrderBySortOrderAscIdAsc(taskId);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            return;
        }
        repository.deleteById(id);
        logger.info("Deleted subtask {}", id);
    }

    @Transactional
    public void deleteForTask(Long taskId) {
        repository.deleteByTaskId(taskId);
    }

    private Subtask find(Long id) {
        Optional<Subtask> match = repository.findById(id);
        if (match.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subtask not found");
        }
        return match.get();
    }

    private String cleanTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        return title.trim();
    }
}
