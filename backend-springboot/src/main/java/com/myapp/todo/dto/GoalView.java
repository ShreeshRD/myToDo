package com.myapp.todo.dto;

import com.myapp.todo.Goal;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Goal plus live progress derived from linked tasks. Reps are the count of
 * completed goal-linked tasks, so uncompleting or deleting a task moves the
 * counter without a separate denormalized field.
 */
@Getter
@Setter
public class GoalView {
    private Long id;
    private String title;
    private Goal.Kind kind;
    private Goal.Mode mode;
    private Double metricCurrent;
    private Double metricTarget;
    private String metricUnit;
    private Integer repsTarget;
    private Goal.Status status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    private long repsCount;
    private long linkedTotal;
    private long linkedCompleted;
    private boolean targetMet;

    public static GoalView from(Goal goal) {
        GoalView view = new GoalView();
        view.setId(goal.getId());
        view.setTitle(goal.getTitle());
        view.setKind(goal.getKind());
        view.setMode(goal.getMode());
        view.setMetricCurrent(goal.getMetricCurrent());
        view.setMetricTarget(goal.getMetricTarget());
        view.setMetricUnit(goal.getMetricUnit());
        view.setRepsTarget(goal.getRepsTarget());
        view.setStatus(goal.getStatus());
        view.setCreatedAt(goal.getCreatedAt());
        view.setCompletedAt(goal.getCompletedAt());
        return view;
    }
}
