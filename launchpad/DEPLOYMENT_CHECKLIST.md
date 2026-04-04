# Deployment Checklist

Use this checklist before deploying Launchpad to production.

## Pre-Deployment

### Code Quality
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console.error or console.warn in production code
- [ ] All API routes have error handling
- [ ] All database queries have proper error handling

### Testing
- [ ] Authentication flow tested
- [ ] Onboarding flow tested
- [ ] Contract upload and analysis tested
- [ ] Receipt upload and analysis tested
- [ ] Quote creation and sending tested
- [ ] Plaid bank connection tested
- [ ] Funding opportunity scanning tested
- [ ] Growth recommendations tested
- [ ] Compliance tracking tested
- [ ] Tax analysis tested

### Security
- [ ] All API routes require authentication (`requireBusinessAccess`)
- [ ] No sensitive data in client-side code
- [ ] Environment variables not committed to git
- [ ] CORS properly configured
- [ ] Rate limiting configured (if needed)
- [ ] Input validation on all API routes
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (React escaping)

### Performance
- [ ] Database indexes created for common queries
- [ ] API routes have appropriate timeouts
- [ ] Large file uploads handled properly
- [ ] Streaming responses for long operations
- [ ] Caching configured (if needed)
- [ ] Bundle size optimized

## Environment Setup

### Production Database
- [ ] PostgreSQL database created
- [ ] Database backups configured
- [ ] Connection pooling configured
- [ ] SSL/TLS enabled
- [ ] Database user has minimal required permissions

### Auth0
- [ ] Production Auth0 application created
- [ ] Callback URLs updated to production domain
- [ ] Logout URLs updated
- [ ] API audience configured
- [ ] Custom claims configured (if needed)

### API Keys & Secrets
- [ ] All API keys rotated (new production keys)
- [ ] Secrets stored in Vercel environment variables
- [ ] No secrets in `.env.local` or git
- [ ] API keys have appropriate rate limits
- [ ] API keys have IP whitelisting (if available)

### Third-Party Services
- [ ] Groq API key configured
- [ ] Gemini API key configured
- [ ] Plaid production credentials configured
- [ ] Stripe production keys configured
- [ ] Vercel Blob storage configured
- [ ] Tiny Fish API key configured (if using)
- [ ] Google Cloud credentials configured (if using)

### Email & Notifications
- [ ] Email service configured (if sending emails)
- [ ] Email templates tested
- [ ] Notification system tested
- [ ] Webhook endpoints configured

## Vercel Deployment

### Project Setup
- [ ] GitHub repository connected to Vercel
- [ ] Production branch set to `main`
- [ ] Preview deployments enabled
- [ ] Automatic deployments enabled

### Environment Variables
- [ ] All production environment variables added
- [ ] No development variables in production
- [ ] Secrets properly encrypted
- [ ] Environment variables match `.env.local.example`

### Build & Runtime
- [ ] Build command: `npm run build`
- [ ] Start command: `npm start`
- [ ] Node.js version: 18+
- [ ] Build succeeds without warnings
- [ ] No build-time errors

### Monitoring
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring configured
- [ ] Uptime monitoring configured
- [ ] Log aggregation configured

## Post-Deployment

### Verification
- [ ] Website loads without errors
- [ ] Authentication works
- [ ] Database queries work
- [ ] API endpoints respond correctly
- [ ] File uploads work
- [ ] Email notifications work (if applicable)

### Testing
- [ ] Full user flow tested
- [ ] All features tested
- [ ] Edge cases tested
- [ ] Error handling tested
- [ ] Performance acceptable

### Monitoring
- [ ] Error logs monitored
- [ ] Performance metrics monitored
- [ ] Database performance monitored
- [ ] API rate limits monitored
- [ ] User feedback monitored

## Ongoing Maintenance

### Regular Tasks
- [ ] Database backups verified weekly
- [ ] Error logs reviewed daily
- [ ] Performance metrics reviewed weekly
- [ ] Security updates applied monthly
- [ ] Dependencies updated monthly

### Monitoring
- [ ] Set up alerts for:
  - [ ] High error rate
  - [ ] Slow API responses
  - [ ] Database connection failures
  - [ ] API rate limit exceeded
  - [ ] Disk space low
  - [ ] Memory usage high

### Documentation
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Incident response plan documented
- [ ] Runbook created for common issues

## Rollback Plan

If deployment fails:

1. **Immediate Actions**
   - [ ] Revert to previous Vercel deployment
   - [ ] Check error logs
   - [ ] Notify team

2. **Investigation**
   - [ ] Identify root cause
   - [ ] Check recent code changes
   - [ ] Check environment variables
   - [ ] Check database migrations

3. **Fix & Redeploy**
   - [ ] Fix the issue
   - [ ] Test locally
   - [ ] Deploy to staging
   - [ ] Deploy to production

## Deployment Commands

### Local Testing
```bash
npm run build
npm run start
```

### Vercel Deployment
```bash
git push origin main
# Vercel automatically deploys
```

### Database Migration
```bash
npx prisma migrate deploy
```

### Rollback
```bash
# In Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous successful deployment
# 3. Click "Promote to Production"
```

## Success Criteria

✅ Deployment is successful when:
- [ ] Website loads without errors
- [ ] All features work as expected
- [ ] No error logs in first hour
- [ ] Performance metrics normal
- [ ] Users can sign in and use the app
- [ ] Database queries complete quickly
- [ ] API responses under 1 second
- [ ] No security warnings

## Contact & Support

- **Deployment Issues**: Check Vercel dashboard
- **Database Issues**: Check PostgreSQL logs
- **API Issues**: Check error logs in Vercel
- **Auth Issues**: Check Auth0 dashboard
- **Payment Issues**: Check Stripe dashboard

## Sign-Off

- [ ] QA approved
- [ ] Product approved
- [ ] Security approved
- [ ] Performance approved
- [ ] Ready for production

**Deployed by**: ________________
**Date**: ________________
**Version**: ________________
