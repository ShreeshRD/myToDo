package com.myapp.todo.dto;

import com.myapp.todo.TodoItem;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import java.util.List;

/**
 * Changes returned to a sync client. {@code serverTime} is the cursor the client
 * sends back as {@code since} on its next pull.
 */
@SuppressFBWarnings(value = { "EI_EXPOSE_REP",
        "EI_EXPOSE_REP2" }, justification = "Plain transport DTO")
public class SyncResponse {
    private long serverTime;
    private List<TodoItem> items;

    public SyncResponse() {
    }

    public SyncResponse(long serverTime, List<TodoItem> items) {
        this.serverTime = serverTime;
        this.items = items;
    }

    public long getServerTime() {
        return serverTime;
    }

    public void setServerTime(long serverTime) {
        this.serverTime = serverTime;
    }

    public List<TodoItem> getItems() {
        return items;
    }

    public void setItems(List<TodoItem> items) {
        this.items = items;
    }
}
