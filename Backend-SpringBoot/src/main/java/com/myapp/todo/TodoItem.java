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
}