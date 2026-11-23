package com.myapp.todo;

import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface TaskEventRepository extends CrudRepository<TaskEvent, Long> {
    List<TaskEvent> findByTaskIdOrderByCreatedAtAscIdAsc(Long taskId);

    long countByTaskId(Long taskId);

    long countByTaskIdAndTypeNot(Long taskId, String type);

    void deleteByTaskId(Long taskId);
}
