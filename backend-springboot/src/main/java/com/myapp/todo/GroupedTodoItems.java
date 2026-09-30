package com.myapp.todo;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class GroupedTodoItems {
    // LinkedHashMap keeps the date keys in the ascending order the service built them in
    private Map<String, List<TodoItem>> itemsByDate;

    public Map<String, List<TodoItem>> getItemsByDate() {
        return itemsByDate == null ? null : new LinkedHashMap<>(itemsByDate);
    }

    public void setItemsByDate(Map<String, List<TodoItem>> itemsByDate) {
        this.itemsByDate = itemsByDate == null ? null : new LinkedHashMap<>(itemsByDate);
    }
}
