package com.myapp.todo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "/todo/scratchpad")
public class ScratchpadController {

    @Autowired
    private ScratchpadService service;

    @GetMapping
    public @ResponseBody Scratchpad getScratchpad() {
        return service.getLastScratchpad();
    }

    @PostMapping
    public @ResponseBody Scratchpad saveScratchpad(@RequestBody String content) {
        return service.saveScratchpad(content);
    }
}
