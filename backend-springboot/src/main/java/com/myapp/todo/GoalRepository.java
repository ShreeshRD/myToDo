package com.myapp.todo;

import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface GoalRepository extends CrudRepository<Goal, Long> {
    List<Goal> findByKindOrderByCreatedAtDesc(Goal.Kind kind);

    List<Goal> findByStatusOrderByCreatedAtDesc(Goal.Status status);
}
