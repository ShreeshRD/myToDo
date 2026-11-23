package com.myapp.todo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubtaskCount {
    private Long taskId;
    private long total;
    private long done;

    public SubtaskCount() {
    }

    public SubtaskCount(Long taskId, long total, long done) {
        this.taskId = taskId;
        this.total = total;
        this.done = done;
    }
}
