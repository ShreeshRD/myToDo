package com.myapp.todo;

import org.springframework.data.repository.CrudRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TodoItemRepository extends CrudRepository<TodoItem, Long> {
    List<TodoItem> findByTaskDate(LocalDate taskDate);

    Optional<TodoItem> findByUuid(String uuid);

    List<TodoItem> findByUpdatedAtGreaterThan(Long since);
}
