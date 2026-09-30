package com.myapp.todo;

import com.myapp.todo.dto.SyncPushRequest;
import com.myapp.todo.dto.SyncResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "/todo/sync")
public class SyncController {

    @Autowired
    private SyncService syncService;

    /** Tasks (including deletion tombstones) changed after {@code since} epoch millis. */
    @GetMapping("/changes")
    public SyncResponse changes(@RequestParam(defaultValue = "0") long since) {
        return syncService.changesSince(since);
    }

    @PostMapping("/push")
    public SyncResponse push(@RequestBody SyncPushRequest request) {
        return syncService.push(request.getItems());
    }
}
