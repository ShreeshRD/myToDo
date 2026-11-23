package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

/**
 * Response of POST /todo/push: the completed original plus the deferred clone.
 */
public class PushResult {
    private String status;

    @SuppressFBWarnings(value = { "EI_EXPOSE_REP",
            "EI_EXPOSE_REP2" }, justification = "TodoItem is an entity object; defensive copying is not appropriate for DTOs")
    private TodoItem original;

    @SuppressFBWarnings(value = { "EI_EXPOSE_REP",
            "EI_EXPOSE_REP2" }, justification = "TodoItem is an entity object; defensive copying is not appropriate for DTOs")
    private TodoItem clone;

    public PushResult() {
    }

    public PushResult(String status, TodoItem original, TodoItem clone) {
        this.status = status;
        this.original = original;
        this.clone = clone;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public TodoItem getOriginal() {
        return original;
    }

    public void setOriginal(TodoItem original) {
        this.original = original;
    }

    public TodoItem getClone() {
        return clone;
    }

    public void setClone(TodoItem clone) {
        this.clone = clone;
    }
}
