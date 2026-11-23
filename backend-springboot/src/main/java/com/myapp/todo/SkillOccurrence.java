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
 * One practice session for a skill ({@code Goal.kind = SKILL}). Occurrences
 * never become tasks and never feed the global heatmap — only the per-skill
 * heatmap and all-time count.
 */
@Getter
@Setter
@Entity
public class SkillOccurrence {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private Long goalId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Convert(converter = LocalDateStringConverter.class)
    private LocalDate date;

    private Integer durationMinutes;

    /** 1–5 performance rating; both duration and rating are required. */
    private Integer rating;

    private LocalDateTime createdAt;

    public SkillOccurrence() {
    }

    public SkillOccurrence(Long goalId, LocalDate date, Integer durationMinutes, Integer rating) {
        this.goalId = goalId;
        this.date = date;
        this.durationMinutes = durationMinutes;
        this.rating = rating;
        this.createdAt = LocalDateTime.now();
    }
}
