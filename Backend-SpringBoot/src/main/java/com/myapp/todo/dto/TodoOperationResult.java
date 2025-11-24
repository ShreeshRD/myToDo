package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;

public class TodoOperationResult {
    private String status;
    private TodoItem item;

    public TodoOperationResult() {
    }

    public TodoOperationResult(String status, TodoItem item) {
        this.status = status;
        this.item = item;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public TodoItem getItem() {
        return item;
    }

    public void setItem(TodoItem item) {
        this.item = item;
    }
}
