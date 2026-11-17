package com.myapp.todo;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A growth target independent of projects. Tasks may link to one goal
 * ({@code TodoItem.goalId}); linking marks the task long-term. Skills are
 * goals with {@link Kind#SKILL}.
 */
@Getter
@Setter
@Entity
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String title;

    @Enumerated(EnumType.STRING)
    private Kind kind = Kind.GOAL;

    @Enumerated(EnumType.STRING)
    private Mode mode = Mode.METRIC;

    private Double metricCurrent;
    private Double metricTarget;
    private String metricUnit;
    private Integer repsTarget;

    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public Goal() {
    }

    public Goal(String title) {
        this.title = title;
        this.createdAt = LocalDateTime.now();
    }

    public enum Kind {
        GOAL,
        SKILL
    }

    public enum Mode {
        METRIC,
        ROADMAP,
        REPS
    }

    public enum Status {
        ACTIVE,
        COMPLETED
    }
}
