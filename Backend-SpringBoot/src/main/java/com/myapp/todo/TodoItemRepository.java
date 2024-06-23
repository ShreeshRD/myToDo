package com.myapp.todo;

import org.springframework.data.repository.CrudRepository;
import java.time.LocalDate;
import java.util.List;

public interface TodoItemRepository extends CrudRepository<TodoItem, Long> {
    List<TodoItem> findByTaskDate(LocalDate taskDate);
}