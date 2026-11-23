package com.myapp.todo;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Append-only activity record for a task. Powers the task detail timeline.
 */
@Getter
@Setter
@Entity
public class TaskEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private Long taskId;

    /** CREATED, COMPLETED, UNCOMPLETED, EDITED, PUSHED */
    private String type;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Convert(converter = LocalDateStringConverter.class)
    private LocalDate fromDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Convert(converter = LocalDateStringConverter.class)
    private LocalDate toDate;

    private LocalDateTime createdAt;

    public TaskEvent() {
    }

    public TaskEvent(Long taskId, String type, String detail, LocalDateTime createdAt) {
        this.taskId = taskId;
        this.type = type;
        this.detail = detail;
        this.createdAt = createdAt;
    }
}
