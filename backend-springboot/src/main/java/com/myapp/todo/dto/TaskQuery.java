package com.myapp.todo.dto;

import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
public class TaskQuery {
    private String q;
    private String exactName;
    private String project;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate start;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate end;
    private String status = "all";   // all | open | completed
    private Boolean recurring;       // null = no filter
    private String order = "asc";    // asc | desc
    private Integer limit = 100;     // clamped 1..500
}
