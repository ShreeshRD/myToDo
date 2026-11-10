package com.myapp.todo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

/**
 * Embedded checklist row for a task. Subtasks have no date or lifecycle of
 * their own; they only appear inside the parent task's detail drawer.
 */
@Getter
@Setter
@Entity
public class Subtask {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private Long taskId;

    private String title;

    private boolean done;

    private int sortOrder;

    public Subtask() {
    }

    public Subtask(Long taskId, String title, int sortOrder) {
        this.taskId = taskId;
        this.title = title;
        this.sortOrder = sortOrder;
    }
}
