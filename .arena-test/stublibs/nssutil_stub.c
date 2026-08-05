/* Minimal stub for libnssutil3.so */
#include <stdint.h>
typedef int32_t PRInt32;
PRInt32 NSS_SetAlgorithmPolicy(uint32_t alg, uint32_t policy, uint32_t flags) { (void)alg; (void)policy; (void)flags; return 0; }
