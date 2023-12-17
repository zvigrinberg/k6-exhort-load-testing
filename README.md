# Perform Load Tests for EXHORT backend

## Goal

To perform Stress and spike load tests on exhort backend.


## Procedure

We will use [k6](https://k6.io/docs#:~:text=What%20is%20k6%3F,performance%20regressions%20and%20problems%20earlier) - an open-source load
Testing tool that turns performance and load testing easy, efficient and saves a lot of boilerplate code to perform these kind of tests using bash scripts or any other complicated programming language code.


### Prerequisites

- Download [k6](https://k6.io/docs/get-started/installation/) to your machine.

### Process

1. Run Stress test using minimal payload (empty sbom) - spin up initial 300 virtual users/threads that will try to send together 200 requests per second for 2 minutes:

**_script-light-request.js_**
```javascript
import { check } from 'k6';
import http from 'k6/http';


export const options = {
    scenarios: {
        constant_request_rate: {
            executor: 'constant-arrival-rate',
            rate: 200,
            timeUnit: '1s', // 200 iterations per second, i.e. 200 RPS
            duration: '2m',
            preAllocatedVUs: 300, // how large the initial pool of VUs would be
            maxVUs: 500, // if the preAllocatedVUs are not enough, we can initialize more
        },
    },
};

const payload = open("./light-sbom.json").toString()

export default function() {
  const params = {
    headers: {
      'Content-Type': 'application/vnd.cyclonedx+json',
      'Accept': 'application/json'
    },
  };

  const res = http.post('https://exhort.stage.devshift.net/api/v4/analysis',payload,params);
  let status = check(res, {
    'is status 200': (r) => r.status === 200
  });
  if(!status)
  {
    console.error(`invocation failed with HTTP Status= ${res.status}, Http Message= ${res.body}`)
  }
}

```
```shell
k6 run script-light-request.js
```

Output:
```shell

          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: script-light-request.js
     output: -

  scenarios: (100.00%) 1 scenario, 500 max VUs, 2m30s max duration (incl. graceful stop):
           * constant_request_rate: 200.00 iterations/s for 2m0s (maxVUs: 300-500, gracefulStop: 30s)

WARN[0004] Insufficient VUs, reached 500 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=constant_request_rate

     ✓ is status 200

     checks.........................: 100.00% ✓ 5856       ✗ 0    
     data_received..................: 16 MB   119 kB/s
     data_sent......................: 7.4 MB  54 kB/s
     dropped_iterations.............: 18144   131.947281/s
     http_req_blocked...............: avg=71.98ms  min=161ns    med=863ns   max=318.24ms p(90)=295.36ms p(95)=300.28ms
     http_req_connecting............: avg=35.37ms  min=0s       med=0s      max=160.1ms  p(90)=145.34ms p(95)=147.75ms
     http_req_duration..............: avg=10.49s   min=403.29ms med=10.72s  max=21.56s   p(90)=11.55s   p(95)=11.83s  
       { expected_response:true }...: avg=10.49s   min=403.29ms med=10.72s  max=21.56s   p(90)=11.55s   p(95)=11.83s  
     http_req_failed................: 0.00%   ✓ 0          ✗ 5856 
     http_req_receiving.............: avg=92.82µs  min=16.76µs  med=85.37µs max=19.79ms  p(90)=136.05µs p(95)=162.53µs
     http_req_sending...............: avg=125.38µs min=35.11µs  med=97.86µs max=533.52µs p(90)=215.99µs p(95)=239.24µs
     http_req_tls_handshaking.......: avg=36.58ms  min=0s       med=0s      max=169.26ms p(90)=150.09ms p(95)=152.51ms
     http_req_waiting...............: avg=10.49s   min=402.83ms med=10.72s  max=21.56s   p(90)=11.55s   p(95)=11.83s  
     http_reqs......................: 5856    42.586159/s
     iteration_duration.............: avg=10.56s   min=698.32ms med=10.73s  max=21.56s   p(90)=11.7s    p(95)=11.94s  
     iterations.....................: 5856    42.586159/s
     vus............................: 1       min=1        max=500
     vus_max........................: 500     min=300      max=500


running (2m17.5s), 000/500 VUs, 5856 complete and 0 interrupted iterations
constant_request_rate ✓ [======================================] 000/500 VUs  2m0s  200.00 iters/s
```

**_Synopsis of results:_**  Total of 5856 requests were sent to exhort in 2 minutes, all the tests finished returning HTTP status 200, as expected( 100% success) with a rate of
42.586 requests per second


2. Run Dynamic Stress test mixed with spike test ( sudden burst of requests) with mid-size payload size ( sbom with few components) - the test is combined out of stages, as depicted in the js script code:

**_script-mid-request.js_**
```javascript
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '0', target: 10 }, // Start with 10 users.
    { duration: '1m', target: 50 }, // gradually increase to 50 users for the next 1 minute
    { duration: '45s', target: 80 }, // gradually increase to 80 concurrent users in the next 45 seconds
    { duration: '0', target: 200 }, // Instantly jump to a peak of 200 concurrent users
    { duration: '1m', target: 200 }, // stays at 200 concurrent users invoking requests for the next 1 minute
    { duration: '1m', target: 100 }, // gradually decrease to 100 concurrent users for the next minute.
    { duration: '1m', target: 0 }, // ramp-down to 0 users gradually over the last minute
  ]
};



const payload = open("./sbom-mid.json").toString()

export default function() {
  const params = {
    headers: {
      'Content-Type': 'application/vnd.cyclonedx+json',
      'Accept': 'application/json'
    },
  };

  const res = http.post('https://exhort.stage.devshift.net/api/v4/analysis',payload,params);
  let status = check(res, {
    'is status 200': (r) => r.status === 200
  });
  if(!status)
  {
    console.error(`invocation failed with HTTP Status= ${res.status}, Http Message= ${res.body}`)
  }
}
```
```shell
k6 run script-mid-request.js
```
Output:
```shell
          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: script-mid-request.js
     output: -

  scenarios: (100.00%) 1 scenario, 200 max VUs, 5m15s max duration (incl. graceful stop):
           * default: Up to 200 looping VUs for 4m45s over 7 stages (gracefulRampDown: 30s, gracefulStop: 30s)


     ✓ is status 200

     checks.........................: 100.00% ✓ 5135      ✗ 0    
     data_received..................: 54 MB   188 kB/s
     data_sent......................: 20 MB   69 kB/s
     http_req_blocked...............: avg=24.31ms  min=167ns    med=924ns    max=368.56ms p(90)=1.62µs   p(95)=294.03ms
     http_req_connecting............: avg=11.77ms  min=0s       med=0s       max=176.15ms p(90)=0s       p(95)=142.43ms
     http_req_duration..............: avg=5.7s     min=555.31ms med=3.83s    max=28.86s   p(90)=12.13s   p(95)=16.34s  
       { expected_response:true }...: avg=5.7s     min=555.31ms med=3.83s    max=28.86s   p(90)=12.13s   p(95)=16.34s  
     http_req_failed................: 0.00%   ✓ 0         ✗ 5135 
     http_req_receiving.............: avg=229.13µs min=17.03µs  med=214.96µs max=139.19ms p(90)=299.8µs  p(95)=350.85µs
     http_req_sending...............: avg=154.09µs min=43.15µs  med=167.07µs max=790.05µs p(90)=220.32µs p(95)=241.3µs 
     http_req_tls_handshaking.......: avg=12.39ms  min=0s       med=0s       max=183.82ms p(90)=0s       p(95)=150.94ms
     http_req_waiting...............: avg=5.7s     min=554.9ms  med=3.83s    max=28.86s   p(90)=12.13s   p(95)=16.34s  
     http_reqs......................: 5135    17.921337/s
     iteration_duration.............: avg=5.72s    min=555.67ms med=3.95s    max=28.86s   p(90)=12.21s   p(95)=16.37s  
     iterations.....................: 5135    17.921337/s
     vus............................: 1       min=1       max=200
     vus_max........................: 200     min=200     max=200


running (4m46.5s), 000/200 VUs, 5135 complete and 0 interrupted iterations
default ✓ [======================================] 000/200 VUs  4m45s
```

**_Synopsis of results:_**  Total of 5135 requests were sent to exhort in total of  4:45 minutes comprised from stages, all the tests finished returning HTTP status 200, as expected( 100% success) with a rate of
17.92 requests per second.