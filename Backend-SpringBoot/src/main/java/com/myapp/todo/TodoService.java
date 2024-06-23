package com.myapp.todo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import java.util.LinkedHashMap;

@Service
public class TodoService {

    @Autowired
    private TodoItemRepository repository;

    public GroupedTodoItems getGroupedByDate() {
        Iterable<TodoItem> todoList = repository.findAll();
        Map<String, List<TodoItem>> itemsByDate = StreamSupport.stream(todoList.spliterator(), false)
                .collect(Collectors.groupingBy(item -> item.getTaskDate().toString()));

        // Sort the map by date
        Map<String, List<TodoItem>> sortedItemsByDate = itemsByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toMap(
                        entry -> entry.getKey(), // Explicitly call getKey()
                        entry -> entry.getValue(), // Explicitly call getValue()
                        (oldValue, newValue) -> oldValue, // Merge function to handle collisions
                        LinkedHashMap::new // Supplier that produces a new LinkedHashMap
                ));

        GroupedTodoItems response = new GroupedTodoItems();
        response.setItemsByDate(sortedItemsByDate);
        return response;
    }
}