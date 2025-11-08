export const mailer2Template = ({ recipientName, crmName, crmEmail, crmPhone }) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>HR Solutions & Recruitment Support</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000;">

    <p>Dear ${recipientName},</p>

    <p>Greetings from <strong>IITGJobs.com Pvt.Ltd.</strong>!</p>

    <p>
      I hope you are doing well. I am <strong>${crmName}</strong>, your
      HR Business Partner at IITGJobs.com. Pvt.Ltd. We provide end-to-end recruitment
      solutions and workforce retention strategies designed to optimize your
      talent management process.
    </p>

    <h3 style="color:#000000;">Key Services We Offer:</h3>

    <h4 style="color:#000000;">1. Churn Prevention & Employee Retention</h4>
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

    <h4 style="color:#000000;">2. Recruitment Services – Preferred Partner Model (PPM)</h4>
    <ul style="color:#000000;">
      <li>
        <strong>Cost-Effective Hiring:</strong> 2% of CTC across all hiring levels
        or flat ₹20,000 for positions below ₹10 LPA.
      </li>
      <li>
        <strong>End-to-End Recruitment:</strong> From sourcing to onboarding,
        our team ensures fast and quality hires.
      </li>
    </ul>

    <p>
      By combining our Churn Prevention Model with PPM recruitment services, you
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

    <!-- Signature -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:14px; color:#000000; line-height:1.6;">
          <strong>Harshika Aginhotri</strong><br/>
          HR Business Partner (HRBP)<br/>
          📞 +91 7701007807<br/>
          ✉️ <a href="mailto:harshika.a@iitgjobs.co.in" style="color:#000000; text-decoration:none;">harshika.a@iitgjobs.co.in</a><br/>
          🌐 <a href="https://iitgjobs.co.in" style="color:#000000; text-decoration:none;">iitgjobs.co.in</a><br/>
          <span style="font-size:13px; color:#000000;">Beside Gulzar Hotel, Mahanadda, Jabalpur</span>
        </td>
      </tr>
    </table>
    
  </body>
</html>
`;
