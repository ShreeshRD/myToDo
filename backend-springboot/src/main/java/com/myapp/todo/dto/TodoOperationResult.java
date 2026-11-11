package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

public class TodoOperationResult {
    private String status;

    /**
     * Non-fatal notice for the caller, e.g. a deferred clone that had activity and
     * was therefore kept when the parent was un-completed. Null when there is
     * nothing to report.
     */
    private String warning;

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

    public String getWarning() {
        return warning;
    }

    public void setWarning(String warning) {
        this.warning = warning;
    }
}
