package com.myapp.todo;

import com.myapp.todo.dto.SyncResponse;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Offline-client sync: clients pull changes since a cursor and push full task
 * snapshots. Conflicts resolve per task by last write wins on {@code updatedAt}.
 */
@Service
public class SyncService {

    private static final Logger logger = LoggerFactory.getLogger(SyncService.class);

    @Autowired
    private TodoItemRepository repository;

    @Autowired
    private TodoService todoService;

    public SyncResponse changesSince(long since) {
        // Cursor is taken before the query so a write racing the read is re-sent next pull
        long serverTime = System.currentTimeMillis();
        return new SyncResponse(serverTime, repository.findByUpdatedAtGreaterThan(since));
    }

    /**
     * Applies client snapshots and returns the stored version of each, plus any
     * next occurrences created because a recurring task was completed.
     */
    @Transactional
    public SyncResponse push(List<TodoItem> incoming) {
        long serverTime = System.currentTimeMillis();
        List<TodoItem> result = new ArrayList<>();
        if (incoming == null) {
            return new SyncResponse(serverTime, result);
        }
        for (TodoItem in : incoming) {
            if (in.getUuid() == null || in.getUuid().isBlank()) {
                continue;
            }
            Optional<TodoItem> existing = repository.findByUuid(in.getUuid());
            if (existing.isEmpty()) {
                result.add(insert(in, serverTime));
                continue;
            }
            TodoItem stored = existing.get();
            long incomingAt = in.getUpdatedAt() == null ? 0 : in.getUpdatedAt();
            long storedAt = stored.getUpdatedAt() == null ? 0 : stored.getUpdatedAt();
            if (incomingAt <= storedAt) {
                // Server copy is newer; the client adopts it on its next pull
                result.add(stored);
                continue;
            }
            boolean wasComplete = stored.isComplete();
            LocalTime scheduledTime = stored.getAssignedTime();
            copyFields(in, stored);
            stored.setUpdatedAt(incomingAt);
            TodoItem saved = repository.save(stored);
            result.add(saved);
            if (!wasComplete && saved.isComplete() && !saved.isDeleted()) {
                TodoItem next = todoService.createNextOccurrence(saved, scheduledTime);
                if (next != null) {
                    result.add(next);
                }
            }
        }
        logger.info("Sync push applied {} items", incoming.size());
        return new SyncResponse(serverTime, result);
    }

    private TodoItem insert(TodoItem in, long serverTime) {
        TodoItem item = new TodoItem();
        item.setUuid(in.getUuid());
        copyFields(in, item);
        if (item.getDayOrder() == null && item.getTaskDate() != null) {
            item.setDayOrder(repository.findByTaskDate(item.getTaskDate()).size() + 1);
        }
        item.setUpdatedAt(in.getUpdatedAt() == null ? serverTime : in.getUpdatedAt());
        return repository.save(item);
    }

    private static void copyFields(TodoItem from, TodoItem to) {
        to.setName(from.getName());
        to.setCategory(from.getCategory());
        to.setTaskDate(from.getTaskDate());
        to.setDayOrder(from.getDayOrder());
        to.setComplete(from.isComplete());
        to.setPriority(from.getPriority() == null ? 0 : from.getPriority());
        to.setRepeatType(from.getRepeatType() == null ? TodoItem.RepeatPattern.NONE : from.getRepeatType());
        to.setRepeatDuration(from.getRepeatDuration() == null ? 0 : from.getRepeatDuration());
        to.setAssignedTime(from.getAssignedTime());
        to.setInProgress(from.isInProgress());
        to.setLongTerm(from.isLongTerm());
        to.setTimeTaken(from.getTimeTaken());
        to.setReminderMinutesBefore(from.getReminderMinutesBefore());
        to.setDeleted(from.isDeleted());
    }
}
