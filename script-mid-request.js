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

// export const options = {
//   iterations: 10,
//   vus: 10
// };


const payload = open("./sbom-mid.json").toString()

// The function that defines VU logic.
//
// See https://grafana.com/docs/k6/latest/examples/get-started-with-k6/ to learn more
// about authoring k6 scripts.
//
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
