package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TodoOperationResult {
    private String status;
    private TodoItem item;
}
