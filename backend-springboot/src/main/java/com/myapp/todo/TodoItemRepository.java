package com.myapp.todo;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface TodoItemRepository extends CrudRepository<TodoItem, Long> {
    List<TodoItem> findByTaskDate(LocalDate taskDate);

    List<TodoItem> findByPushedFromId(Long pushedFromId);

    List<TodoItem> findByGoalId(Long goalId);

    long countByGoalIdAndCompleteTrue(Long goalId);

    /**
     * Completes a task only if it is still open. Returns 1 when this caller
     * claimed the completion, 0 if it was already complete (or missing).
     * Used by push so concurrent requests cannot both create a deferred clone.
     */
    @Modifying
    @Transactional
    @Query("UPDATE TodoItem t SET t.complete = true, t.completedAt = :completedAt, t.inProgress = false "
            + "WHERE t.id = :id AND t.complete = false")
    int markCompleteIfOpen(@Param("id") Long id, @Param("completedAt") LocalDateTime completedAt);
}