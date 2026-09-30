package com.myapp.todo;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Gives rows created before sync existed a uuid, timestamp and explicit deleted flag. */
@Component
public class SyncBackfill implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(SyncBackfill.class);

    private final TodoItemRepository repository;

    public SyncBackfill(TodoItemRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        long now = System.currentTimeMillis();
        int count = 0;
        for (TodoItem item : repository.findAll()) {
            if (item.getUuid() != null && item.getUpdatedAt() != null) {
                continue;
            }
            if (item.getUuid() == null) {
                item.setUuid(UUID.randomUUID().toString());
            }
            if (item.getUpdatedAt() == null) {
                item.setUpdatedAt(now);
            }
            item.setDeleted(item.isDeleted());
            repository.save(item);
            count++;
        }
        if (count > 0) {
            logger.info("Backfilled sync metadata on {} tasks", count);
        }
    }
}
