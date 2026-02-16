FROM nginx:1.27.4-alpine-slim

RUN rm /etc/nginx/conf.d/default.conf

COPY ./default.conf /etc/nginx/templates/default.conf.template

COPY ./frontend/dist/blaulichtcloud/browser /usr/share/nginx/html

COPY ./frontend/src/assets/version.json /usr/share/nginx/html/assets/version.json
