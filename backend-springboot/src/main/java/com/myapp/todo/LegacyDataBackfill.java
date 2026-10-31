package com.myapp.todo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fills the new lifecycle timestamps for rows created before they existed.
 *
 * Legacy completed tasks stored their completion time in assignedTime, so that is
 * the best available source for completedAt. Rows that already have timestamps are
 * never touched.
 */
@Component
public class LegacyDataBackfill implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(LegacyDataBackfill.class);

    private final TodoItemRepository repository;

    public LegacyDataBackfill(TodoItemRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        int updated = 0;
        for (TodoItem item : repository.findAll()) {
            boolean changed = false;

            if (item.getCreatedAt() == null) {
                LocalDate taskDate = item.getTaskDate();
                item.setCreatedAt(taskDate != null ? taskDate.atStartOfDay() : LocalDateTime.now());
                changed = true;
            }

            if (item.isComplete() && item.getCompletedAt() == null) {
                LocalDate taskDate = item.getTaskDate();
                if (taskDate != null && item.getAssignedTime() != null) {
                    item.setCompletedAt(taskDate.atTime(item.getAssignedTime()));
                } else if (taskDate != null) {
                    item.setCompletedAt(taskDate.atStartOfDay());
                } else {
                    item.setCompletedAt(LocalDateTime.now());
                }
                changed = true;
            }

            if (changed) {
                repository.save(item);
                updated++;
            }
        }

        if (updated > 0) {
            logger.info("Backfilled lifecycle timestamps for {} task(s)", updated);
        }
    }
}
