package com.myapp.todo;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
public class TodoItem {
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate taskDate;
    private Integer dayOrder;
    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;
    private String category;
    private String name;
    private boolean complete;
    private RepeatPattern repeatType;
    private Integer repeatDuration;
    private Integer priority;

    public TodoItem() {}

    public TodoItem(LocalDate taskDate, Integer dayOrder, String category, String name) {
        this.taskDate = taskDate;
        this.dayOrder = dayOrder;
        this.category = category;
        this.name = name;
        this.complete = false;
    }

    @Override
    public String toString() {
        return String.format(
                "TodoItem[id=%d, category='%s', name='%s', complete='%b']",
                id, category, name, complete);
    }

    public LocalDate getTaskDate() {
        return taskDate;
    }

    public void setTaskDate(LocalDate taskDate) {
        this.taskDate = taskDate;
    }

    public Integer getDayOrder() {
        return dayOrder;
    }

    public void setDayOrder(Integer dayOrder) {
        this.dayOrder = dayOrder;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        return;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
        return;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
        return;
    }

    public boolean isComplete() {
        return complete;
    }

    public void setComplete(boolean complete) {
        this.complete = complete;
        return;
    }

    public RepeatPattern getRepeatType() {
        return repeatType;
    }

    public void setRepeatType(RepeatPattern repeatType) {
        this.repeatType = repeatType;
    }

    public enum RepeatPattern {
        NONE,
        EVERY_X_DAYS,
        EVERY_X_WEEKS,
        EVERY_X_MONTHS,
        SPECIFIC_WEEKDAYS
    }

    public Integer getRepeatDuration() {
        return repeatDuration;
    }

    public void setRepeatDuration(Integer repeatDuration) {
        this.repeatDuration = repeatDuration;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }
}

