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
