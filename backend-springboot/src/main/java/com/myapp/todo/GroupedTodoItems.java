package com.myapp.todo;

import java.util.Map;
import java.util.HashMap;
import java.util.List;

public class GroupedTodoItems {
    private Map<String, List<TodoItem>> itemsByDate;

    public Map<String, List<TodoItem>> getItemsByDate() {
        return itemsByDate == null ? null : new HashMap<>(itemsByDate);
    }

    public void setItemsByDate(Map<String, List<TodoItem>> itemsByDate) {
        this.itemsByDate = itemsByDate == null ? null : new HashMap<>(itemsByDate);
    }
}