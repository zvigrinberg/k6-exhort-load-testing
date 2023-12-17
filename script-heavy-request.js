import { check } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 60,
  iterations: 1000
};

// export const options = {
//   iterations: 10,
//   vus: 10
// };


const payload = open("./sbom.json").toString()

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

  const res = http.post('http://latest-exhort.apps.sssc-cl01.appeng.rhecoeng.com/api/v4/analysis',payload,params);
  let status = check(res, {
    'is status 200': (r) => r.status === 200
  });
  if(!status)
  {
    console.error(`invocation failed with HTTP Status= ${res.status}, Http Message= ${res.body}`)
  }
}
