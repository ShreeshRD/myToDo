package com.myapp.todo;

import java.util.Map;
import java.util.List;

public class GroupedTodoItems {
    private Map<String, List<TodoItem>> itemsByDate;

    public Map<String, List<TodoItem>> getItemsByDate() {
        return itemsByDate;
    }

    public void setItemsByDate(Map<String, List<TodoItem>> itemsByDate) {
        this.itemsByDate = itemsByDate;
    }
}