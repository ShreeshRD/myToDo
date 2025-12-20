package com.myapp.todo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class ScratchpadService {

    @Autowired
    private ScratchpadRepository repository;

    // Using specific ID 1 for the singleton scratchpad for now
    private static final Long DEFAULT_ID = 1L;

    public Scratchpad getLastScratchpad() {
        Optional<Scratchpad> scratchpad = repository.findById(DEFAULT_ID);
        return scratchpad.orElseGet(() -> {
            Scratchpad newScratchpad = new Scratchpad("");
            newScratchpad.setId(DEFAULT_ID);
            return repository.save(newScratchpad);
        });
    }

    public Scratchpad saveScratchpad(String content) {
        Scratchpad scratchpad = getLastScratchpad();
        scratchpad.setContent(content);
        scratchpad.setLastModified(LocalDateTime.now());
        return repository.save(scratchpad);
    }
}
