package com.myapp.todo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectCount {
    private String name;
    private long count;

    public ProjectCount() {
    }

    public ProjectCount(String name, long count) {
        this.name = name;
        this.count = count;
    }
}
