#!/bin/bash

# Install dependencies
npm install

# Rebuild mongoose
npm rebuild mongoose

# Clean up
npm cache clean --force