/* Minimal stub for libnspr4.so — satisfies the dynamic linker for chromium.
   Only the symbols chromium imports are defined; real functionality is
   NOT implemented (this is only good enough to boot a headless shell and
   navigate to http://localhost). */

#include <stdint.h>
#include <time.h>

typedef int32_t PRInt32;
typedef int64_t PRInt64;
typedef int64_t PRTime;

PRInt32 PR_GetError(void) { return 0; }
PRInt32 PR_GetOSError(void) { return 0; }
PRInt32 PR_GetErrorTextLength(void) { return 0; }
char *PR_GetErrorText(void) { return (char *)0; }
PRInt32 PR_Init(void) { return 0; }

PRTime PR_Now(void) {
  struct timespec ts;
  clock_gettime(CLOCK_REALTIME, &ts);
  return ((PRTime)ts.tv_sec * 1000000LL) + (ts.tv_nsec / 1000);
}
