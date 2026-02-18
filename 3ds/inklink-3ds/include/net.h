#pragma once
#include <3ds.h>
#include <stdbool.h>

typedef struct {
    int x;
    int y;
    int touching;
    u32 held;
    u32 down;
    u32 up;
} InkPacket;

bool net_init(void);
void net_close(void);
bool net_send(const InkPacket* p);
