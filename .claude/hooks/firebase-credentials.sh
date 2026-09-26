#!/bin/bash
# Au début de chaque session, écrit la clé du compte de service Firebase
# (variable FIREBASE_SERVICE_ACCOUNT) dans le fichier désigné par
# GOOGLE_APPLICATION_CREDENTIALS, si ce fichier est absent ou vide.
[ -n "$FIREBASE_SERVICE_ACCOUNT" ] && [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] || exit 0
[ -s "$GOOGLE_APPLICATION_CREDENTIALS" ] && exit 0
umask 077
printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$GOOGLE_APPLICATION_CREDENTIALS"
