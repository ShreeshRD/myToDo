package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

public class TodoOperationResult {
    private String status;

    @SuppressFBWarnings(value = { "EI_EXPOSE_REP",
            "EI_EXPOSE_REP2" }, justification = "TodoItem is an entity object; defensive copying is not appropriate for DTOs")
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
