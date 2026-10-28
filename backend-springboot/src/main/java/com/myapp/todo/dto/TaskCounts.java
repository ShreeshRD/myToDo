package com.myapp.todo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TaskCounts {
    private long count;
    private long open;
    private long completed;

    public TaskCounts() {
    }

    public TaskCounts(long count, long open, long completed) {
        this.count = count;
        this.open = open;
        this.completed = completed;
    }
}
