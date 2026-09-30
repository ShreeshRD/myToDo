package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import java.util.List;

/** Full task snapshots changed on a client, keyed by {@code uuid}; {@code id} is ignored. */
@SuppressFBWarnings(value = { "EI_EXPOSE_REP",
        "EI_EXPOSE_REP2" }, justification = "Plain transport DTO")
public class SyncPushRequest {
    private List<TodoItem> items;

    public List<TodoItem> getItems() {
        return items;
    }

    public void setItems(List<TodoItem> items) {
        this.items = items;
    }
}
