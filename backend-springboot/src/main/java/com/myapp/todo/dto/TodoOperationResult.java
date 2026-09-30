package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

@SuppressFBWarnings(value = { "EI_EXPOSE_REP",
        "EI_EXPOSE_REP2" }, justification = "TodoItem is an entity object; defensive copying is not appropriate for DTOs")
public class TodoOperationResult {
    private String status;

    private TodoItem item;

    // Next occurrence created when a recurring task is completed; null otherwise
    private TodoItem nextItem;

    public TodoOperationResult() {
    }

    public TodoOperationResult(String status, TodoItem item) {
        this.status = status;
        this.item = item;
    }

    public TodoOperationResult(String status, TodoItem item, TodoItem nextItem) {
        this.status = status;
        this.item = item;
        this.nextItem = nextItem;
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

    public TodoItem getNextItem() {
        return nextItem;
    }

    public void setNextItem(TodoItem nextItem) {
        this.nextItem = nextItem;
    }
}
