package com.myapp.todo;

import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface SubtaskRepository extends CrudRepository<Subtask, Long> {
    List<Subtask> findByTaskIdOrderBySortOrderAscIdAsc(Long taskId);

    long countByTaskId(Long taskId);

    void deleteByTaskId(Long taskId);
}
