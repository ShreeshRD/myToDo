package com.myapp.todo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
public class Scratchpad {

    @Id
    private Long id;

    @Column(columnDefinition = "TEXT") // Use TEXT to store large JSON strings
    private String content;

    private LocalDateTime lastModified;

    public Scratchpad() {
    }

    public Scratchpad(String content) {
        this.content = content;
        this.lastModified = LocalDateTime.now();
    }
}
