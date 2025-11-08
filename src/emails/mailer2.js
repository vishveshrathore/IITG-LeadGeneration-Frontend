export const mailer2Template = ({ recipientName, crmName, crmEmail, crmPhone }) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>HR Solutions & Recruitment Support</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000;">

    <p>Dear ${recipientName},</p>
    <p>Greetings from <strong>IITGJobs.com Pvt. Ltd.</strong>!</p>
    <p>
      I hope you are doing well. I am <strong>${crmName}</strong>, your
      HR Business Partner at IITGJobs.com Pvt. Ltd. We provide end-to-end recruitment
      solutions and workforce retention strategies designed to optimize your
      talent management process.
    </p>

    <h3 style="color:#000000;">Key Services We Offer:</h3>

    <h4 style="color:#000000;"><strong>1. ATTRITION PREVENTION & EMPLOYEE RETENTION</strong></h4>
    <ul style="color:#000000;">
      <li>
        <strong>Employee Risk Reports:</strong> Bi-monthly actionable reports
        to identify employees who may be exploring other opportunities.
      </li>
      <li>
        <strong>Retention Strategy Team:</strong> Our HR experts collaborate
        with your internal teams to implement tailored retention plans.
      </li>
    </ul>

    <h4 style="color:#000000;"><strong>2. RECRUITMENT SERVICES – PREFERRED PARTNER MODEL (PPM)</strong></h4>
    <ul style="color:#000000;">
      <li>
        <strong>Cost-Effective Hiring:</strong> 2% of CTC across all hiring levels
        or a flat ₹20,000 for positions below ₹10 LPA.
      </li>
      <li>
        <strong>End-to-end Recruitment:</strong> From sourcing to onboarding,
        our team ensures fast and quality hires.
      </li>
    </ul>

    <p>
      By combining our Attrition Prevention Model with PPM recruitment services, you
      can maintain a stable workforce and reduce talent gaps effectively.
    </p>

    <h3 style="color:#000000;">Next Steps</h3>
    <p>
      I would be delighted to schedule a brief call at your convenience to
      discuss a customized approach for your organization. Please find the
      attached presentation for more details.
    </p>

    <p>Looking forward to your positive response.</p>

    <p style="margin:0 0 25px; color:#000000;">
      Warm regards,<br/>
      <strong>${crmName}</strong><br/>
      ${crmPhone ? `📞 ${crmPhone}<br/>` : ''}
      ${crmEmail ? `✉️ <a href="mailto:${crmEmail}" style="color:#000000; text-decoration:none;">${crmEmail}</a><br/>` : ''}
    </p>
    <div style="text-align:center; background:#f4f6f8; padding:15px; font-size:12px; color:#000000; margin-top:16px;">
      &copy; ${new Date().getFullYear()} IITGJobs.com Pvt. Ltd. All Rights Reserved.
    </div>
  </body>
</html>
`;
